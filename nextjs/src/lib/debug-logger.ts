import * as fs from 'fs';
import * as path from 'path';

const logFile = path.join(process.cwd(), 'debug-inngest.log');

export function logDebug(message: string) {
    try {
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
    } catch (e) {
        // ignore
    }
}
