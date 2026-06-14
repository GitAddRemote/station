import { Box, Container, Typography } from '@mui/material';

const AlphaLanding = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e2328',
      }}
    >
      <Container maxWidth="sm">
        <Box textAlign="center">
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4A9EFF 0%, #7ABDFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            STATION
          </Typography>
          <Typography
            variant="h5"
            sx={{ color: '#e8eaed', mb: 2, fontWeight: 600 }}
          >
            Private Alpha
          </Typography>
          <Typography sx={{ color: '#9aa0a6', lineHeight: 1.7 }}>
            Station is currently in private alpha.
            <br />
            If you have an invite, use your invite link to get started.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default AlphaLanding;
