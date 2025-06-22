import { NextRequest, NextResponse } from 'next/server';

// const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'; // Local Docker URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://askmydoc-backend-v3.onrender.com'; // Render Deployment URL

interface QueryRequest {
  query: string;
  page_num: number;
  chat_history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json();

    // Validate required fields
    if (!body.query || typeof body.page_num !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: query and page_num' },
        { status: 400 }
      );
    }

    // Prepare request for FastAPI backend
    const backendRequest = {
      query: body.query,
      page_num: Math.max(0, body.page_num), // Ensure non-negative
      chat_history: body.chat_history || [],
    };

    console.log('Sending to backend:', {
      url: `${BACKEND_URL}/query_response`,
      body: backendRequest
    });

    const backendResponse = await fetch(`${BACKEND_URL}/query_response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendRequest),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.text();
    
    return NextResponse.json({
      response: result,
    });

  } catch (error) {
    console.error('Error in query_response route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

