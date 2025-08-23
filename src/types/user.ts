
export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
};


export type AuthUser = {
  id: string;
  kid: string;
  name: string;
  email: string;
  roles?: string[];
} | null;
