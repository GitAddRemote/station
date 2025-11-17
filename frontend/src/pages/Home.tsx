import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  AppBar,
  Toolbar,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import SecurityIcon from '@mui/icons-material/Security';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SpeedIcon from '@mui/icons-material/Speed';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const Home = () => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#1e2328' }}>
      {/* Navigation Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4A9EFF 0%, #7ABDFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            STATION
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              component={Link}
              to="/login"
              variant="outlined"
              sx={{ borderRadius: '6px' }}
            >
              Sign In
            </Button>
            <Button
              component={Link}
              to="/register"
              variant="contained"
              sx={{ borderRadius: '6px' }}
            >
              Get Started
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1e2328 0%, #2a2f35 50%, #1e2328 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(74, 158, 255, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'pulse 4s ease-in-out infinite',
          },
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 0.5,
              transform: 'translate(-50%, -50%) scale(1)',
            },
            '50%': {
              opacity: 0.8,
              transform: 'translate(-50%, -50%) scale(1.1)',
            },
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center">
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 800,
                mb: 3,
                background: 'linear-gradient(135deg, #7ABDFF 0%, #4A9EFF 50%, #2563EB 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 40px rgba(74, 158, 255, 0.3)',
              }}
            >
              Manage Your Gaming Guild
              <br />
              Like a Pro
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: '#e8eaed',
                mb: 5,
                maxWidth: '800px',
                mx: 'auto',
                fontSize: { xs: '1.1rem', md: '1.5rem' },
                lineHeight: 1.6,
              }}
            >
              Powerful organization management, role-based permissions, and
              member coordination for competitive gaming teams.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
            >
              <Button
                component={Link}
                to="/register"
                variant="contained"
                size="large"
                startIcon={<RocketLaunchIcon />}
                sx={{
                  fontSize: '1.1rem',
                  px: 4,
                  py: 1.5,
                  boxShadow: '0 8px 24px rgba(74, 158, 255, 0.4)',
                }}
              >
                Get Started Free
              </Button>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                size="large"
                sx={{
                  fontSize: '1.1rem',
                  px: 4,
                  py: 1.5,
                }}
              >
                Sign In
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography
          variant="h2"
          align="center"
          sx={{
            mb: 2,
            fontWeight: 700,
            color: '#e8eaed',
          }}
        >
          Everything Your Guild Needs
        </Typography>
        <Typography
          variant="h6"
          align="center"
          sx={{
            mb: 8,
            color: '#9aa0a6',
            maxWidth: '700px',
            mx: 'auto',
          }}
        >
          Built for competitive gaming teams who need professional-grade
          organization tools
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(74, 158, 255, 0.1)',
                    mb: 3,
                  }}
                >
                  <GroupsIcon sx={{ fontSize: 40, color: '#4A9EFF' }} />
                </Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  Multi-Organization Support
                </Typography>
                <Typography sx={{ color: '#9aa0a6', lineHeight: 1.7 }}>
                  Manage multiple guilds from one account with separate roles and
                  permissions for each organization.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(74, 158, 255, 0.1)',
                    mb: 3,
                  }}
                >
                  <SecurityIcon sx={{ fontSize: 40, color: '#4A9EFF' }} />
                </Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  Advanced Permissions
                </Typography>
                <Typography sx={{ color: '#9aa0a6', lineHeight: 1.7 }}>
                  Fine-grained role-based access control with flexible permission
                  sets for every organization and member.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(74, 158, 255, 0.1)',
                    mb: 3,
                  }}
                >
                  <DashboardIcon sx={{ fontSize: 40, color: '#4A9EFF' }} />
                </Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  Intuitive Dashboard
                </Typography>
                <Typography sx={{ color: '#9aa0a6', lineHeight: 1.7 }}>
                  Clean, modern interface for managing members, roles, and guild
                  operations with real-time updates.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(74, 158, 255, 0.1)',
                    mb: 3,
                  }}
                >
                  <SpeedIcon sx={{ fontSize: 40, color: '#4A9EFF' }} />
                </Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  Lightning Fast
                </Typography>
                <Typography sx={{ color: '#9aa0a6', lineHeight: 1.7 }}>
                  Redis-powered caching ensures instant load times for member
                  lists and permission checks.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(74, 158, 255, 0.1)',
                    mb: 3,
                  }}
                >
                  <AdminPanelSettingsIcon sx={{ fontSize: 40, color: '#4A9EFF' }} />
                </Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  Member Profiles
                </Typography>
                <Typography sx={{ color: '#9aa0a6', lineHeight: 1.7 }}>
                  Rich member profiles with bio, contact info, and role history
                  across all organizations.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(74, 158, 255, 0.1)',
                    mb: 3,
                  }}
                >
                  <SecurityIcon sx={{ fontSize: 40, color: '#4A9EFF' }} />
                </Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  Secure & Reliable
                </Typography>
                <Typography sx={{ color: '#9aa0a6', lineHeight: 1.7 }}>
                  JWT authentication with refresh tokens, bcrypt password hashing,
                  and comprehensive security measures.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          py: 10,
          background: 'linear-gradient(135deg, #2563EB 0%, #4A9EFF 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography
              variant="h2"
              sx={{
                mb: 3,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              Ready to Level Up Your Guild?
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 4,
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              Join thousands of gaming organizations using Station to manage their teams
            </Typography>
            <Button
              component={Link}
              to="/register"
              variant="contained"
              size="large"
              sx={{
                fontSize: '1.2rem',
                px: 5,
                py: 2,
                background: '#fff',
                color: '#2563EB',
                '&:hover': {
                  background: '#f0f0f0',
                  boxShadow: '0 0 30px rgba(255, 255, 255, 0.5)',
                },
              }}
            >
              Get Started Free
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          py: 4,
          borderTop: '1px solid rgba(74, 158, 255, 0.1)',
          textAlign: 'center',
        }}
      >
        <Container>
          <Typography sx={{ color: '#9aa0a6' }}>
            © 2025 Station. Built for competitive gaming guilds.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
