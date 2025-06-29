
        const { contextBridge, ipcRenderer } = require('electron');
        contextBridge.exposeInMainWorld('electronAPI', {
            openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),
            // Add other methods for file system, path, etc. later
            readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
            writeTextFile: (filePath, content) => ipcRenderer.invoke('write-text-file', filePath, content),
            createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
            path: {
                homeDir: () => ipcRenderer.invoke('get-home-dir'),
                join: (...args) => ipcRenderer.invoke('path-join', ...args)
            },
            exists: (filePath) => ipcRenderer.invoke('check-exists', filePath),
            readProjectsFile: () => ipcRenderer.invoke('read-projects-file'),
            writeProjectsFile: (projects) => ipcRenderer.invoke('write-projects-file', projects),
            readAllEnrichedRepos: () => ipcRenderer.invoke('read-all-enriched-repos')
        });
    