export async function onRequest(context) {
  return new Response(
    JSON.stringify({
      success: true,
      message: `Thanks for your message.`,
      details: "Details" 
    }),
    { 
      status: 200, 
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store' // Prevent caching
      }
    }
  );
}
