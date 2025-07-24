import { appRouter } from '@/server/routers/_app';
import { NextRequest } from 'next/server';

// Create a server-side tRPC caller
export async function createServerSideTRPC() {
  // Create a minimal mock request for server-side calls
  const mockRequest = new NextRequest(
    new URL('http://localhost'),
    {
      method: 'GET',
    }
  );

  // Create context with null session for public procedures
  const context = {
    session: null,
    req: mockRequest,
  };
  
  return appRouter.createCaller(context);
}