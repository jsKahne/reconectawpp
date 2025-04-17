export type ConnectionState = 'close' | 'open' | 'pairing' | 'connecting';

export interface Instance {
    name: string;
    profileName?: string;
    profilePicUrl?: string;
    qrcode?: string;
    connectionStatus: ConnectionState;
}
