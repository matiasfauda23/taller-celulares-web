import { createResourceHandler } from "@/lib/api/resource-proxy";

const handle = createResourceHandler("clients");

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, (await context.params).path);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, (await context.params).path);
}

export async function PATCH(request: Request, context: RouteContext) {
  return handle(request, (await context.params).path);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handle(request, (await context.params).path);
}
