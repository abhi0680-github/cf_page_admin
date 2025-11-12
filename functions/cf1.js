export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const name = formData.get('name');
  const email = formData.get('email');
  const phone = formData.get('phone');
  const message = formData.get('message');
  const db = context.env.DB; // DB is whatever you named the binding
  await db.prepare("INSERT INTO form_data (name, email, phone, message) VALUES (?, ?, ?, ?)").bind(name, email, phone, message).run();

  return new Response(
    JSON.stringify({
      success: true,
      message: `Thanks ${name} for your message.`,
      details: { name, email, phone, message }
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
