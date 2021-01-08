import { APIGatewayProxyEvent } from "aws-lambda";

export interface RequestEvent extends APIGatewayProxyEvent {
  authenticatedUser: string,
}

export interface Activity {
  (event: RequestEvent): any;
}

export class NoActivityError extends Error {}
export class AuthenticationError extends Error {}

export class Delegator {
  private activityMap: { [path: string]: { [method: string]: Activity } };

  constructor() {
    this.activityMap = {};
  }

  protected addActivity(path: string, method: string, activity: Activity) {
    if(!(path in this.activityMap)) this.activityMap[path] = {};
    this.activityMap[path][method] = activity;
  }

  public delegate(path: string, method: string, event: APIGatewayProxyEvent) {
    if(!(path in this.activityMap) || !(method in this.activityMap[path])) {
      throw new NoActivityError(`No activity configured for ${method}:${path}`);
    }

    let authenticatedUser: string;
    if(!("Authorization" in event.headers) || event.headers["Authorization"] === undefined) {
      throw new AuthenticationError("No Authorization header provided");
    } else {
      try {
        authenticatedUser = event.headers["Authorization"].split(" ")[1];
      } catch(e) {
        throw new AuthenticationError("Authorization header is malformed");
      }
    }

    return this.activityMap[path][method]({
      ...event,
      authenticatedUser
    });
  }
}