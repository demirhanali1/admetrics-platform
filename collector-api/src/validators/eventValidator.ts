export function validateEventPayload(body: any): boolean {
    return (
        body &&
        typeof body === "object" &&
        body.source &&
        typeof body.source === "string" &&
        body.payload &&
        typeof body.payload === "object"
    );
}
