import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  // Log para ver qué datos tenemos disponibles
  // console.log('=== REQUEST DATA ===');
  // console.log('Method:', req.method);
  // console.log('URL:', req.url);
  // console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  // console.log('=== CONTEXT DATA ===');
  // console.log('Deploy:', context.deploy);
  // console.log('Request ID:', context.requestId);
  // console.log('Site:', context.site);
  // console.log('Params:', context.params);
  
  return await webhookHandler(req);
};

const webhookHandler = async(req: Request): Promise<Response> => {
  let githubEvent: string;
  try {
    githubEvent = req.headers.get("x-github-event")!;
    console.log('GitHub Event:', githubEvent);
  } catch (error) {
    return new Response(JSON.stringify({
      error: ((error as Error).message)
    }), { status: 400 });
  }

  try {
    // Parse the JSON payload
    const payload = await req.json();
    // console.log('Payload keys:', Object.keys(payload));
    let message: string = `Event: ${githubEvent}`;

    const result = await notify(message);
    if (result){
      return new Response('Webhook processed successfully', { status: 202 });
    } else {
      return new Response('Failed to send notification', { status: 500 });
    }
  } catch (error) {
    // console.error('Error processing webhook:', {error});
    if ((error instanceof Error)) {
      return new Response(JSON.stringify({message: (error as Error).message}), { status: 400 });
    }
    return new Response('Internal server error', { status: 500 });
  }
};

const onStar = (payload: any): string => {
  const { action, sender, repository } = payload;
  let message: string;
  message = `User ${sender.login} ${action} star on ${repository.full_name}`;
  return message;
};

const onIssue = (payload: any): string => {
  const { action, sender, repository } = payload;
  let message: string = `User: ${sender.login}\nAction: ${action}\nRepository: ${repository.full_name}`;
  // console.log({ message });
  return message;
};

const notify = async (message: string) => {
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!discordWebhookUrl) {
    console.error("DISCORD_WEBHOOK_URL environment variable is not set");
    return false;
  }

  const body = {
    content: message,
  };

  try {
    const resp = await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      console.error("Error sending message to discord:", resp.status, resp.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in notify function:", error);
    return false;
  }
};