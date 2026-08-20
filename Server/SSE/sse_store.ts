import { Response } from "express";

class SSE {
  private clients: Map<string, Response>;
  private pingInterval: NodeJS.Timeout | null;

  constructor() {
    this.clients = new Map<string, Response>();
    this.pingInterval = null;
  }

  startPing(): void {
    if (!this.pingInterval) {
      this.pingInterval = setInterval(() => {
        this.clients.forEach((res) => {
          try {
            res.write(":: ping \n\n");
          } catch (err) {
            console.log(err, "error in sending ping.");
          }
        });
      }, 20000);
    }
  }

  stopPing(): void {
    if (this.pingInterval && this.clients.size === 0) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  addClient(clientId: string, res: Response): void {
    const isClient = this.clients.has(clientId);

    if (isClient) {
      const oldSocket = this.clients.get(clientId);
      oldSocket?.end();
      console.log(
        "we are replacing the previous client, client id:",
        clientId
      );
    }
    this.clients.set(clientId, res);
    this.startPing();
    console.log(
      `${clientId} <- client id and map size -> ${this.clients.size}`
    );
  }

  removeClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
    }
    this.stopPing();
  }

  sendToClient(clientId: string, payload: any): boolean {
    if (!this.clients.has(clientId)) {
      console.log("client id is not present in map");
      return false;
    }
    const res = this.clients.get(clientId);
    res?.write(`data: ${JSON.stringify(payload)}\n\n`);
    return true;
  }

  broadCastToServer(eventType: string, data: any): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((res, clientId) => {
      try {
        res.write(payload);
      } catch (error) {
        console.log(error);
        this.removeClient(clientId);
      }
    });
  }
}

const sseObj = new SSE();

export default sseObj;
