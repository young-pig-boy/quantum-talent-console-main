'use client';

import ReactDOM from 'react-dom';

export function FontPreload() {
  ReactDOM.preconnect('https://fonts.googleapis.cn');
  ReactDOM.preconnect('https://fonts.gstatic.cn');
  return null;
}
