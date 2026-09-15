import { createResourceHandler } from "@/lib/api/resource-proxy";

const handle = createResourceHandler("devices");

export async function GET(request: Request) {
  return handle(request, []);
}

export async function POST(request: Request) {
  return handle(request, []);
}
