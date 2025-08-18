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

const webhookHandler = async (req: Request): Promise<Response> => {
  let githubEvent: string;
  try {
    githubEvent = req.headers.get("x-github-event")!;
    console.log("GitHub Event:", githubEvent);

    // Verify Github's signature
    const isValidSignature = await verifyGithubSignature(req);
    if (!isValidSignature) {
      return new Response(
        JSON.stringify({
          error: "Invalid signature",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: `${(error as Error).message}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse the JSON payload
    const payload = await req.json();
    console.log('Payload keys:', Object.keys(payload));
    
    // Generate descriptive message based on event type
    let message: string = generateEventMessage(githubEvent, payload);

    const result = await notify(message);
    if (result) {
      return new Response(
        JSON.stringify({
          success: true,
          event: githubEvent,
          description: "Webhook processed successfully",
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: "Failed to send notification",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // console.error('Error processing webhook:', {error});
    if (error instanceof Error) {
      return new Response(
        JSON.stringify({ message: (error as Error).message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("Internal server error", { status: 500 });
  }
};

const generateEventMessage = (eventType: string, payload: any): string => {
  switch (eventType) {
    case 'ping':
      return onPing(payload);
    case 'star':
    case 'watch': // GitHub uses 'watch' for starring
      return onStar(payload);
    case 'issues':
      return onIssue(payload);
    case 'push':
      return onPush(payload);
    case 'pull_request':
      return onPullRequest(payload);
    case 'fork':
      return onFork(payload);
    case 'create':
      return onCreate(payload);
    case 'delete':
      return onDelete(payload);
    case 'release':
      return onRelease(payload);
    default:
      return `🔔 **${eventType}** event in ${payload.repository?.full_name || 'unknown repository'}`;
  }
};

const onPing = (payload: any): string => {
  const { zen, hook, repository } = payload;
  const hookUrl = hook?.config?.url || 'unknown URL';
  
  return `🏓 **Webhook configured successfully!**\n` +
         `📍 Repository: [${repository.full_name}](${repository.html_url})\n` +
         `🔗 Webhook URL: ${hookUrl}\n` +
         `💭 _"${zen}"_ - GitHub Zen`;
};

const onStar = (payload: any): string => {
  const { action, sender, repository } = payload;
  const emoji = action === 'created' ? '⭐' : '💔';
  const verb = action === 'created' ? 'starred' : 'unstarred';
  
  return `${emoji} **${sender.login}** ${verb} [${repository.full_name}](${repository.html_url})`;
};

const onIssue = (payload: any): string => {
  const { action, sender, repository, issue } = payload;
  const emoji = action === 'opened' ? '🐛' : action === 'closed' ? '✅' : '📝';
  
  return `${emoji} **${sender.login}** ${action} issue [#${issue.number}: ${issue.title}](${issue.html_url}) in [${repository.full_name}](${repository.html_url})`;
};

const onPush = (payload: any): string => {
  const { pusher, repository, commits, ref } = payload;
  const branch = ref.replace('refs/heads/', '');
  const commitCount = commits.length;
  
  return `🚀 **${pusher.name}** pushed ${commitCount} commit${commitCount !== 1 ? 's' : ''} to [${repository.full_name}:${branch}](${repository.html_url}/tree/${branch})`;
};

const onPullRequest = (payload: any): string => {
  const { action, sender, repository, pull_request } = payload;
  const emoji = action === 'opened' ? '🔀' : action === 'closed' ? (pull_request.merged ? '✅' : '❌') : '📝';
  
  return `${emoji} **${sender.login}** ${action} pull request [#${pull_request.number}: ${pull_request.title}](${pull_request.html_url}) in [${repository.full_name}](${repository.html_url})`;
};

const onFork = (payload: any): string => {
  const { forkee, sender, repository } = payload;
  
  return `🍴 **${sender.login}** forked [${repository.full_name}](${repository.html_url}) to [${forkee.full_name}](${forkee.html_url})`;
};

const onCreate = (payload: any): string => {
  const { ref_type, ref, sender, repository } = payload;
  const emoji = ref_type === 'branch' ? '🌿' : ref_type === 'tag' ? '🏷️' : '📁';
  
  return `${emoji} **${sender.login}** created ${ref_type} **${ref}** in [${repository.full_name}](${repository.html_url})`;
};

const onDelete = (payload: any): string => {
  const { ref_type, ref, sender, repository } = payload;
  const emoji = ref_type === 'branch' ? '🗂️' : ref_type === 'tag' ? '🗑️' : '❌';
  
  return `${emoji} **${sender.login}** deleted ${ref_type} **${ref}** from [${repository.full_name}](${repository.html_url})`;
};

const onRelease = (payload: any): string => {
  const { action, sender, repository, release } = payload;
  const emoji = action === 'published' ? '🎉' : '📦';
  
  return `${emoji} **${sender.login}** ${action} release [${release.tag_name}: ${release.name}](${release.html_url}) in [${repository.full_name}](${repository.html_url})`;
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
      console.error(
        "Error sending message to discord:",
        resp.status,
        resp.statusText
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in notify function:", error);
    return false;
  }
};

const verifyGithubSignature = async (req: Request): Promise<boolean> => {
  const xHubSignature = req.headers.get("x-hub-signature-256");
  console.log('Raw signature header:', xHubSignature);
  
  // Check if signature verification should be enforced
  const enforceSignature = process.env.ENFORCE_GITHUB_SIGNATURE === 'true';
  const secret = process.env.SECRET_TOKEN;
  
  console.log('Enforce signature:', enforceSignature);
  console.log('Secret configured:', !!secret);
  
  if (!enforceSignature) {
    console.log('Signature verification disabled by environment variable');
    return true;
  }
  
  if (!xHubSignature || xHubSignature === 'null') {
    console.log('Missing signature header - rejecting request');
    return false;
  }

  if (!secret) {
    console.error("SECRET_TOKEN environment variable required when ENFORCE_GITHUB_SIGNATURE=true");
    return false;
  }
  
  const clonedReq = req.clone();
  const body = await clonedReq.text();
  
  return await verifySignature(secret, xHubSignature, body);
};

const verifySignature = async (
  secret: string,
  header: string,
  payload: string
) => {
  try {
    const encoder = new TextEncoder();
    let parts = header.split("=");
    
    if (parts.length !== 2 || parts[0] !== 'sha256') {
      console.error('Invalid signature header format:', header);
      return false;
    }
    
    let sigHex = parts[1];
    
    if (!sigHex || sigHex.length === 0) {
      console.error('Empty signature hex value');
      return false;
    }

    let algorithm = { name: "HMAC", hash: { name: "SHA-256" } };

    let keyBytes = encoder.encode(secret);
    let extractable = false;
    let key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      algorithm,
      extractable,
      ["sign", "verify"]
    );

    let sigBytes = hexToBytes(sigHex);
    let dataBytes = encoder.encode(payload);
    let equal = await crypto.subtle.verify(
      algorithm.name,
      key,
      sigBytes as BufferSource,
      dataBytes
    );

    return equal;
  } catch (error) {
    console.error('Error in signature verification:', error);
    return false;
  }
};

const hexToBytes = (hex: string): Uint8Array => {
  if (!hex || typeof hex !== 'string') {
    throw new Error('Invalid hex string provided');
  }
  
  const matches = hex.match(/.{1,2}/g);
  if (!matches) {
    throw new Error('Unable to parse hex string');
  }
  
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
};
