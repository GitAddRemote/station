import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(15000);

afterEach(() => {
  window.sessionStorage.clear();
});
