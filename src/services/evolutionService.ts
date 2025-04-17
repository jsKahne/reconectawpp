/* eslint-disable no-useless-catch */
import axios from 'axios';
import { Instance, ConnectionState } from '../types/Instance';

const api = axios.create({
    baseURL: import.meta.env.VITE_EVOLUTION_BASE_URL,
    headers: {
        'apikey': import.meta.env.VITE_EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
    }
});

// Log para verificar as configurações
console.log('API Config:', {
    baseURL: import.meta.env.VITE_EVOLUTION_BASE_URL,
    apiKey: import.meta.env.VITE_EVOLUTION_API_KEY,
});

export const getInstances = async (): Promise<Instance[]> => {
    try {
        console.log('Fazendo requisição para obter instâncias...');
        const response = await api.get('/instance/fetchInstances');
        console.log('Resposta recebida:', response.data);
        return response.data;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Erro na requisição:', {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers
            });
        } else {
            console.error('Erro ao obter instâncias:', error);
        }
        throw error;
    }
};

export const connectInstance = async (instanceName: string): Promise<{ qrcode?: string; state: ConnectionState }> => {
    // Função para tentar obter o QR code com timeout
    const getQRCodeWithTimeout = async (): Promise<{ qrcode?: string; state: ConnectionState }> => {
        const timeoutPromise = new Promise<{ qrcode?: string; state: ConnectionState }>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao gerar QR code')), 40000); // 40 segundos
        });

        const connectPromise = (async () => {
            try {
                // Tenta desconectar primeiro
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                await api.delete(`/instance/logout/${instanceName}`).catch(err => {
                    // Ignora erro de desconexão pois pode ser que a instância já esteja desconectada
                });

                // Pequena pausa
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Tenta conectar
                const response = await api.get(`/instance/connect/${instanceName}`);


                if (response.data.base64) {
                    return {
                        qrcode: response.data.base64,
                        state: 'pairing' as ConnectionState
                    };
                }

                // Se não tem QR code, tenta novamente
                await new Promise(resolve => setTimeout(resolve, 1000));
                const retryResponse = await api.get(`/instance/connect/${instanceName}`);
                
                if (retryResponse.data.base64) {
                    return {
                        qrcode: retryResponse.data.base64,
                        state: 'pairing' as ConnectionState
                    };
                }

                throw new Error('Não foi possível gerar o QR code');
            } catch (error) {
                throw error;
            }
        })();

        try {
            // Retorna o que completar primeiro: ou o QR code ou o timeout
            return await Promise.race([connectPromise, timeoutPromise]);
        } catch (error) {

            throw error;
        }
    };

    try {
        return await getQRCodeWithTimeout();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {

        return { state: 'close' };
    }
};

export const checkInstanceConnection = async (instanceName: string): Promise<ConnectionState> => {
    try {
        const response = await api.get(`/instance/connectionState/${instanceName}`);
        console.log(`Estado da conexão bruto para ${instanceName}:`, response.data);

        // Caso específico: se a resposta contém um objeto instance com state
        if (response.data?.instance?.state) {
            const instanceState = response.data.instance.state.toLowerCase();
            console.log(`Estado encontrado no objeto instance: ${instanceState}`);
            
            if (instanceState.includes('open')) return 'open';
            if (instanceState.includes('pair')) return 'pairing';
            if (instanceState.includes('connect')) return 'connecting';
            return 'close';
        }

        // Caso padrão: buscar estado diretamente
        const state = response.data?.state || response.data?.status || 'close';
        const normalizedState = state.toLowerCase();
        
        console.log(`Estado normalizado para ${instanceName}: ${normalizedState}`);
        
        if (normalizedState.includes('open')) return 'open';
        if (normalizedState.includes('pair')) return 'pairing';
        if (normalizedState.includes('connect')) return 'connecting';
        return 'close';
    } catch (error) {
        console.error(`Erro ao verificar conexão da instância ${instanceName}:`, error);
        return 'close';
    }
};
