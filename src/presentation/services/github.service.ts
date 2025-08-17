import { GitHubStarPayload } from "../../interfaces/github-star.interface";

export class GitHubService {
  constructor() {}

  onStar(payload: GitHubStarPayload): string {
    const { action, sender, repository } = payload;
    let message: string;

    message = `User ${sender.login} ${action} star on ${repository.full_name}`;

    return message;
  }

  default(payload: any): string {
    const { action, sender, repository } = payload;
    let message: string = `User: ${sender.login}\nAction: ${action}\nRepository: ${repository.full_name}`;
    console.log({ message });

    return message;
  }
}
