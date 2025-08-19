const path = require('path');

module.exports = {
  packagerConfig: {
    // Optional: give your app a custom icon
    icon: path.resolve(__dirname, 'assets', 'logo'),
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'curators_vault_mvp',
      },
    },
  ],
  
  // Hooks can be added here if needed in the future
};