import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Forward the request to FastAPI backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const backendResponse = await fetch(`${BACKEND_URL}/parse_pdf`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to parse PDF' },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    
    return NextResponse.json({
      message: result.message || result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in parse_pdf route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
