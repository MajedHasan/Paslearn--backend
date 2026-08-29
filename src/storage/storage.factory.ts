import { StorageDriver } from "./storage.interface";
import { LocalStorageDriver } from "./local.driver";
import { CloudflareR2Driver } from "./cloudflare.driver";

let driver: StorageDriver;

export function getStorageDriver(): StorageDriver {
  if (!driver) {
    const driverName = process.env.STORAGE_DRIVER || "local";
    switch (driverName) {
      case "cloudflare_r2":
        driver = new CloudflareR2Driver();
        break;
      case "local":
      default:
        driver = new LocalStorageDriver();
        break;
    }
  }
  return driver;
}