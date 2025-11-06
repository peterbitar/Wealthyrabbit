import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    console.log('Running Prisma migration...');

    const { stdout, stderr } = await execAsync('npx prisma db push --skip-generate');

    console.log('Migration output:', stdout);
    if (stderr) console.error('Migration stderr:', stderr);

    return NextResponse.json({
      success: true,
      message: 'Database migration completed',
      output: stdout,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      output: error.stdout,
      stderr: error.stderr,
    }, { status: 500 });
  }
}
