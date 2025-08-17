import { Request, Response } from "express";
import { GitHubService } from "../services/github.service";
import { DiscordService } from "../services/discord.service";

export class GitHubController {


  constructor(
    private readonly gitHubService: GitHubService = new GitHubService(),
    private readonly dicordService: DiscordService = new DiscordService(),
  ) {}


  webhookHandler = ( req: Request, res: Response ) => {

    const githubEvent = req.header('x-github-event') ?? 'UNKNOWN';
    // const signature = req.header('x-hub-signature-256') ?? 'UNKNOWN';
    const payload = req.body;
    let message: string;

    switch( githubEvent ) {
      case 'star': 
        message = this.gitHubService.onStar( payload );
      break;

      // case 'issue':

      // break;

      default:
        // message = `Unknown event ${githubEvent}`;
        message = this.gitHubService.default( payload );
        
    }
    
    this.dicordService.notify( message )
      .then( () => res.status(202).send('Accepted'))
      .catch( () => res.status(500).json({ error: 'Internal server error'}));
    
  }
}