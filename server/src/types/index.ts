export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  establishment_id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
