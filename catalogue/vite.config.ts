import { defineConfig } from 'vite';
export default defineConfig({
 plugins:[{name:'catalogue-client-context',enforce:'pre',transform(code,id){
  // This entire catalogue runs in the browser. The library build preserves these directives.
  if(id.includes('/src/') && /^['"]use client['"];?/u.test(code))return {code:code.replace(/^['"]use client['"];?/u,'// Browser catalogue context'),map:null};
 }}],
 build:{rollupOptions:{output:{manualChunks(id){if(id.includes('/node_modules/')&&/react/.test(id))return 'react';if(id.endsWith('game-demonstrations.json'))return 'demonstrations';}}}}
});
