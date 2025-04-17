import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, CircularProgress, Alert, TextField } from '@mui/material';
import InstanceCard from './components/InstanceCard';
import { Instance } from './types/Instance';
import { getInstances, connectInstance, checkInstanceConnection } from './services/evolutionService';

function App() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const apiKey = process.env.VITE_EVOLUTION_API_KEY;
  const baseUrl = process.env.VITE_EVOLUTION_BASE_URL;

  useEffect(() => {

    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const data = await getInstances();
      if (Array.isArray(data)) {
        setInstances(data);
      } else {
        setError('Formato de dados inválido');
      }
    } catch (err) {

      setError(err instanceof Error ? err.message : 'Erro ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (instanceName: string) => {
    try {
      const result = await connectInstance(instanceName);
      // Atualiza o estado da instância na lista
      setInstances(instances.map(inst => {
        if (inst.name === instanceName) {
          return { ...inst, connectionStatus: result.state };
        }
        return inst;
      }));
      return result;
    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      throw error;
    }
  };

  const handleCheckConnection = async (instanceName: string) => {
    try { 
      const state = await checkInstanceConnection(instanceName);
      // Atualiza o estado da instância na lista
      setInstances(instances.map(inst => {
        if (inst.name === instanceName) {
          return { ...inst, connectionStatus: state };
        }
        return inst;
      }));
      return state;
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!apiKey || !baseUrl) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="warning" sx={{ maxWidth: 600, textAlign: 'center' }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            ATENÇÃO
          </Typography>
          Configure seu .env com as informações necessárias
        </Alert>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 4 } }}>
      <Box sx={{ 
        maxWidth: '800px', 
        mx: 'auto', 
        mb: { xs: 3, sm: 4 },
        textAlign: 'center'
      }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontSize: { xs: '1.75rem', sm: '2.25rem' },
            fontWeight: 600,
            mb: { xs: 2, sm: 3 },
            color: '#1a1a1a'
          }}
        >
          Conectar WhatsApp RECONECTA
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Pesquisar instâncias..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            backgroundColor: 'white',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5
            }
          }}
        />
      </Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)'
        },
        gap: { xs: 2, sm: 3 },
        width: '100%',
        maxWidth: '1400px',
        mx: 'auto',
        px: { xs: 1, sm: 2 },
        '& > div': {
          justifySelf: 'center',
          width: '100%',
          maxWidth: '320px'
        }
      }}>
        {instances
          .filter(instance => 
            (instance.profileName || instance.name)
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
          .map((instance) => (
          <Box key={instance.name}>
            <InstanceCard
              instance={instance}
              onConnect={handleConnect}
              onCheckConnection={handleCheckConnection}
            />
          </Box>
        ))}
      </Box>
    </Container>
  );
}

export default App;
