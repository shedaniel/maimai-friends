import { appRouter } from '@/server/routers/_app';
import { NextRequest } from 'next/server';

// Create a server-side tRPC caller
export async function createServerSideTRPC(session?: any) {
  // Create a minimal mock request for server-side calls
  const mockRequest = new NextRequest(
    new URL('http://localhost'),
    {
      method: 'GET',
    }
  );

  // Create context with provided session (or null for public procedures)
  const context = {
    session: session || null,
    req: mockRequest,
  };
  
  return appRouter.createCaller(context);
}