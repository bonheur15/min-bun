import fs from 'fs';
import * as path from 'path';
import express, { Request, Response } from 'express';

// --- Interfaces (from original script) ---

// Define an interface for the results of our permission checks.
interface PermissionResult {
  path: string;
  type: 'File' | 'Folder' | 'Unknown';
  exists: boolean;
  canRead: boolean;
  canWrite: boolean;
  error?: string; // To store any specific error message
}


// --- Core Logic (from original script, largely unchanged) ---

/**
 * Checks read and write permissions for a given file or folder path.
 * @param {string} targetPath - The absolute path to the file or folder.
 * @returns {Promise<PermissionResult>} - A promise that resolves with the permission check results.
 */
const checkPathPermissions = async (targetPath: string): Promise<PermissionResult> => {
  const result: PermissionResult = {
    path: targetPath,
    type: 'Unknown',
    exists: false,
    canRead: false,
    canWrite: false,
  };

  try {
    // 1. Check if the path exists and get its stats.
    const stats = await fs.promises.stat(targetPath);
    result.exists = true;
    result.type = stats.isDirectory() ? 'Folder' : 'File';

    // 2. Check for read access.
    try {
      await fs.promises.access(targetPath, fs.constants.R_OK);
      result.canRead = true;
    } catch (readError) {
      result.canRead = false;
    }

    // 3. Check for write access.
    try {
      await fs.promises.access(targetPath, fs.constants.W_OK);
      result.canWrite = true;
    } catch (writeError) {
      result.canWrite = false;
    }

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      result.error = 'Path does not exist.';
    } else {
      result.error = `An unexpected error occurred: ${error.message}`;
    }
  }

  return result;
};


// --- Express Server Setup ---

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- API Endpoints ---

/**
 * @route GET /
 * @description A simple welcome message for the root endpoint.
 */
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ 
        message: 'Welcome to the File Permission and CPU Load API! ...',
        endpoints: {
            demo: 'GET /demo',
            cpu: 'GET /cpu'
        }
    });
});


/**
 * @route GET /demo
 * @description Runs the permission check on a predefined list of paths and returns a JSON report.
 */
app.get('/demo', async (req: Request, res: Response) => {
  console.log('Received request for /demo endpoint.');
  
  // Define the files and folders to check.
  const pathsToProcess: string[] = [
    path.resolve('./'), // Current directory
    path.resolve('./package.json'),
    path.resolve('./dist'),
    path.resolve('./a-fake-file-that-does-not-exist.txt'),
    '/root/test.txt' // A file we likely cannot access
  ];

  try {
    const checkPromises = pathsToProcess.map(p => checkPathPermissions(p));
    const results = await Promise.all(checkPromises);
    
    console.log('Permission check complete. Sending report.');
    res.status(200).json({
        reportTitle: 'File and Folder Permission Report',
        generatedAt: new Date().toISOString(),
        results: results
    });

  } catch (err: any) {
    console.error("An error occurred while processing /demo:", err);
    res.status(500).json({ error: 'An internal server error occurred.', details: err.message });
  }
});


/**
 * @route GET /cpu
 * @description Simulates a CPU-intensive task by running a large loop before responding.
 * This will block the Node.js event loop, demonstrating the effect of a long-running synchronous task.
 */
app.get('/cpu', (req: Request, res: Response) => {
    console.log('Received request for /cpu endpoint. Starting intensive task123');
    const startTime = Date.now();

    // WARNING: This is a synchronous, blocking operation.
    // It's designed to max out a CPU core for a short period.
    // In a real application, such tasks should be offloaded to a worker thread.
    const intensiveCalculation = () => {
        let total = 0;
        // Loop for several billion iterations to consume CPU time.
        for (let i = 0; i < 5_000_000_000; i++) {
            total += Math.sqrt(i);
        }
        return total;
    };
    
    const result = intensiveCalculation(); // This line will block execution.

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Duration in seconds

    console.log(`CPU-intensive task finished in ${duration.toFixed(2)} seconds.`);
    res.status(200).json({
        message: 'CPU-intensive task completed!',
        durationSeconds: duration,
        // We include the result to prevent the loop from being optimized away by the engine.
        calculationResult: result 
    });
});


// --- Start the server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
