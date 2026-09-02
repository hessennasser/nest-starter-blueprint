export type MailConfig = {
  host?: string;
  port: number;
  user?: string;
  password?: string;
  secure: boolean;
  requireTls: boolean;
  fromEmail: string;
  fromName: string;
  /** Derived: true only when a host + credentials are present. */
  enabled: boolean;
};
