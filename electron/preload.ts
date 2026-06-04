import { contextBridge, ipcRenderer } from "electron";

const omegaApi = {
  window: {
    openCapsule: () => ipcRenderer.invoke("window:openCapsule"),
    closeCapsule: () => ipcRenderer.invoke("window:closeCapsule"),
    showFloating: () => ipcRenderer.invoke("window:showFloating"),
    setFloatingPosition: (x: number, y: number) =>
      ipcRenderer.invoke("window:setFloatingPosition", { x, y }),
    quit: () => ipcRenderer.invoke("window:quit"),
    hideFloating: () => ipcRenderer.invoke("window:hideFloating")
  },
  state: {
    getOmegaState: () => ipcRenderer.invoke("state:getOmegaState"),
    updateOmegaState: (partialState: unknown) =>
      ipcRenderer.invoke("state:updateOmegaState", partialState),
    getSessionLog: () => ipcRenderer.invoke("state:getSessionLog")
  },
  memory: {
    saveSummary: (summary: string) =>
      ipcRenderer.invoke("memory:saveSummary", summary),
    getSummaries: () => ipcRenderer.invoke("memory:getSummaries")
  },
  ai: {
    sendMessage: (payload: { text: string; includeScreenshot: boolean }) =>
      ipcRenderer.invoke("ai:sendMessage", payload)
  },
  onShowContextMenu: (callback: () => void) => {
    ipcRenderer.on("show-context-menu", () => callback());
    return () => { ipcRenderer.removeAllListeners("show-context-menu"); };
  }
};

contextBridge.exposeInMainWorld("omega", omegaApi);

export type OmegaBridge = typeof omegaApi;