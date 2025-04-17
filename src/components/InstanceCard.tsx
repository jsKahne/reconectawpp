
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, CircularProgress, Typography } from '@mui/material';
import { Instance } from '../types/Instance';
import ProfileIcon from './ProfileIcon';
import './InstanceCard.css';

import { ConnectionState } from '../types/Instance';

interface InstanceCardProps {
    instance: Instance;
    onConnect: (instanceName: string) => Promise<{ qrcode?: string; state: ConnectionState }>;
    onCheckConnection: (instanceName: string) => Promise<ConnectionState>;
}

const InstanceCard = ({ instance, onConnect, onCheckConnection }: InstanceCardProps) => {
    const [openQR, setOpenQR] = useState(false);
    const [loading, setLoading] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState>(instance.connectionStatus || 'close');
    const [error, setError] = useState('');
    const [checkCount, setCheckCount] = useState(0);
    const [timeoutMessage, setTimeoutMessage] = useState(false);
    const [isConnectionInitiated, setIsConnectionInitiated] = useState(false);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastCheckedStateRef = useRef<ConnectionState | null>(null);
    const consecutiveOpenChecksRef = useRef(0);

    useEffect(() => {
        setConnectionState(instance.connectionStatus);

        const checkConnection = async () => {
            if (!loading) {
                try {
                    const state = await onCheckConnection(instance.name);
                    console.log(`Regular check for ${instance.name}: State = ${state}`);
                    setConnectionState(state);

                    if (isConnectionInitiated && state === 'open' && openQR) {
                        setOpenQR(false);
                        setLoading(false);
                        setIsConnectionInitiated(false);
                    }
                } catch (error) {
                    console.error('Erro ao verificar conexão:', error);
                }
            }
        };

        const interval = setInterval(checkConnection, 30000);
        return () => clearInterval(interval);
    }, [instance.connectionStatus, instance.name, loading, onCheckConnection, isConnectionInitiated, openQR]);

    useEffect(() => {
        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (connectionState === 'open') {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
            instance.qrcode = undefined;
            setLoading(false);
            setOpenQR(false);
            setIsConnectionInitiated(false);
        }
    }, [connectionState, instance]);

    const handleConnect = async () => {
        if (connectionState === 'open' as ConnectionState) {
            return;
        }

        lastCheckedStateRef.current = null;
        consecutiveOpenChecksRef.current = 0;
        setIsConnectionInitiated(true);

        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }

        setLoading(true);
        setOpenQR(true);
        setTimeoutMessage(false);
        setCheckCount(0);

        try {
            const result = await onConnect(instance.name);
            console.log(`Initial connection result for ${instance.name}:`, result.state);
            setConnectionState(result.state);

            if (result.qrcode && result.state !== 'open') {
                instance.qrcode = result.qrcode;
            } else {
                instance.qrcode = undefined;
                setOpenQR(false);
            }

            if (result.state === 'open') {
                setLoading(false);
                setOpenQR(false);
                setIsConnectionInitiated(false);
                return;
            }

            if (result.state === 'pairing' || result.state === 'connecting') {
                setCheckCount(0);

                setTimeout(async () => {
                    try {
                        const immediateState = await onCheckConnection(instance.name);
                        console.log(`Immediate check for ${instance.name}:`, immediateState);
                        if (immediateState === 'open') {
                            setConnectionState(immediateState);
                            setLoading(false);
                            setOpenQR(false);
                            setIsConnectionInitiated(false);
                            return;
                        }
                    } catch (err) {
                        console.error('Error in immediate check:', err);
                    }
                }, 3000);

                checkIntervalRef.current = setInterval(async () => {
                    // Dentro do objeto que contém checkIntervalRef.current = setInterval(async () => {...
                    try {
                        const state = await onCheckConnection(instance.name);
                        console.log(`Check ${checkCount + 1} para ${instance.name}:`, state);

                        // Atualize o estado de conexão
                        setConnectionState(state);

                        // Verifica se está realmente conectado
                        if (state === 'open') {
                            consecutiveOpenChecksRef.current += 1;
                            console.log(`Verificação consecutiva OPEN #${consecutiveOpenChecksRef.current}`);

                            if (consecutiveOpenChecksRef.current >= 2) {
                                console.log(`Confirmada conexão após ${consecutiveOpenChecksRef.current} verificações`);
                                if (checkIntervalRef.current) {
                                    clearInterval(checkIntervalRef.current);
                                    checkIntervalRef.current = null;
                                }
                                instance.qrcode = undefined;
                                setLoading(false);
                                setOpenQR(false);
                                setIsConnectionInitiated(false);
                                return;
                            }
                        } else {
                            // Resetar contador se não estiver conectado
                            if (consecutiveOpenChecksRef.current > 0) {
                                console.log('Estado não está mais aberto, resetando contador');
                                consecutiveOpenChecksRef.current = 0;
                            }
                        }

                        setCheckCount(prev => {
                            const newCount = prev + 1;
                            console.log(`Contador de verificações: ${newCount}/12`);

                            if (newCount >= 12) {
                                if (checkIntervalRef.current) {
                                    clearInterval(checkIntervalRef.current);
                                    checkIntervalRef.current = null;
                                }
                                setTimeoutMessage(true);
                                setLoading(false);
                                setIsConnectionInitiated(false);
                                return newCount;
                            }
                            return newCount;
                        });
                    } catch (err) {
                        console.error('Error checking connection:', err);
                        if (checkIntervalRef.current) {
                            clearInterval(checkIntervalRef.current);
                            checkIntervalRef.current = null;
                        }
                        setLoading(false);
                        setIsConnectionInitiated(false);
                    }
                }, 10000);
            } else {
                setLoading(false);
                setIsConnectionInitiated(false);
            }
        } catch (error) {
            console.error('Connection error:', error);
            setError('Erro ao conectar instância');
            setConnectionState('close' as ConnectionState);
            setOpenQR(false);
            instance.qrcode = undefined;
            setIsConnectionInitiated(false);
        } finally {
            if (instance.qrcode || error) {
                setLoading(false);
            }
        }
    };

    return (
        <>
            <div className="instance-card">
                <div className="profile-image">
                    {instance.profilePicUrl ? (
                        <img
                            src={instance.profilePicUrl}
                            alt={instance.name}
                            loading="lazy"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                    ) : null}
                    <div className="profile-icon" style={{ display: instance.profilePicUrl ? 'none' : 'flex' }}>
                        <ProfileIcon />
                    </div>
                </div>
                <div className="profile-info">
                    <div className="profile-name">{instance.profileName || instance.name}</div>
                    <div className={`profile-status ${connectionState === ('open' as ConnectionState) ? 'status-connected' :
                            connectionState === ('connecting' as ConnectionState) ? 'status-connecting' :
                                connectionState === ('pairing' as ConnectionState) ? 'status-pairing' :
                                    'status-disconnected'
                        }`}>
                        {connectionState === ('open' as ConnectionState) ? 'Conectado' :
                            connectionState === ('connecting' as ConnectionState) ? 'Conectando...' :
                                connectionState === ('pairing' as ConnectionState) ? 'Aguardando QR Code...' :
                                    'Desconectado'}
                    </div>
                    <button
                        className={`connect-button ${connectionState === ('open' as ConnectionState) ? 'connected' : 'disconnected'}`}
                        onClick={handleConnect}
                        disabled={false}
                    >
                        {connectionState === 'open' ? 'Conectado' :
                            connectionState === 'connecting' ? 'Reconectar' :
                                connectionState === 'pairing' ? 'Reconectar' :
                                    'Conectar'}
                    </button>
                </div>
            </div>

            <Dialog
                open={openQR}
                onClose={() => {
                    if (!loading) setOpenQR(false);
                }}
                aria-labelledby="qr-dialog-title"
                aria-describedby="qr-dialog-description"
                keepMounted={false}
                disablePortal={false}
                disableScrollLock={false}
                disableEscapeKeyDown={loading}
                style={{ pointerEvents: loading ? 'none' : 'auto' }}
            >
                <DialogTitle id="qr-dialog-title">Conectar Instância</DialogTitle>
                <DialogContent id="qr-dialog-description">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        {(loading || !instance.qrcode) ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <CircularProgress aria-label="Gerando QR Code" />
                                <Typography style={{ marginTop: '15px' }}>Gerando QR Code...</Typography>
                            </div>
                        ) : timeoutMessage ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <Typography variant="h6" style={{ color: '#f44336', marginBottom: '15px' }}>
                                    Infelizmente não foi possível conectar
                                </Typography>
                                <Typography style={{ marginBottom: '20px', color: '#666' }}>
                                    Por favor, tente novamente mais tarde.
                                </Typography>
                                <button
                                    className="success-button"
                                    onClick={() => {
                                        setOpenQR(false);
                                        setTimeoutMessage(false);
                                    }}
                                    style={{
                                        backgroundColor: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '1em'
                                    }}
                                >
                                    Fechar
                                </button>
                            </div>
                        ) : connectionState === 'open' ? (
                            <div className="success-content">
                                <img
                                    src={instance.profilePicUrl || '/default-profile.png'}
                                    alt={instance.profileName || instance.name}
                                    style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '15px' }}
                                />
                                <Typography variant="h6" style={{ color: '#4CAF50', marginBottom: '10px' }}>
                                    Instância Conectada!
                                </Typography>
                                <Typography variant="body1" style={{ marginBottom: '20px' }}>
                                    {instance.profileName || instance.name}
                                </Typography>
                                <button
                                    className="success-button"
                                    onClick={() => setOpenQR(false)}
                                    style={{
                                        backgroundColor: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '1em'
                                    }}
                                >
                                    OK
                                </button>
                            </div>
                        ) : instance.qrcode ? (
                            <>
                                <img
                                    src={instance.qrcode}
                                    alt="QR Code para conexão"
                                    style={{ width: '256px', height: '256px' }}
                                />
                                <Typography>Escaneie o QR Code no WhatsApp</Typography>
                                <Typography variant="caption" style={{ color: '#666' }}>
                                    Tentativa {checkCount}/12
                                </Typography>
                            </>
                        ) : (
                            <div role="alert">QR Code não disponível</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!error}
                onClose={() => setError('')}
                aria-labelledby="error-dialog-title"
                aria-describedby="error-dialog-description"
                keepMounted={false}
                disablePortal
            >
                <DialogTitle id="error-dialog-title">Aviso</DialogTitle>
                <DialogContent id="error-dialog-description">
                    <div role="alert">{error}</div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default InstanceCard;
