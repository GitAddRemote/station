import axios from 'axios';

const API_URL = 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
});

export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password });

export const getProfile = (token: string) =>
  api.get('/users/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
