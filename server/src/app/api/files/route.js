import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import File from '@/models/File';

// Handle CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request) {
  try {
    await dbConnect();
    
    const files = await File.find({})
      .select('fileId fileName fileType fileSize uploadedAt')
      .sort({ uploadedAt: -1 })
      .limit(50);
    
    return NextResponse.json({ files }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
    
  } catch (error) {
    console.error('Files fetch error:', error);
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
