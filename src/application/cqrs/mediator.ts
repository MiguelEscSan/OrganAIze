export type Message = { readonly kind: string };

export type CommandHandler<C extends Message, R> = (command: C) => Promise<R>;

export type QueryHandler<Q extends Message, R> = (query: Q) => Promise<R>;

type AnyHandler = (message: never) => Promise<unknown>;

export class Mediator {
  private readonly commandHandlers = new Map<string, AnyHandler>();
  private readonly queryHandlers = new Map<string, AnyHandler>();

  registerCommand<C extends Message, R>(kind: C["kind"], handler: CommandHandler<C, R>): void {
    this.commandHandlers.set(kind, handler as AnyHandler);
  }

  registerQuery<Q extends Message, R>(kind: Q["kind"], handler: QueryHandler<Q, R>): void {
    this.queryHandlers.set(kind, handler as AnyHandler);
  }

  async send<C extends Message, R>(command: C): Promise<R> {
    const handler = this.commandHandlers.get(command.kind) as CommandHandler<C, R> | undefined;

    if (!handler) {
      throw new Error(`No command handler registered for ${command.kind}`);
    }

    return handler(command);
  }

  async ask<Q extends Message, R>(query: Q): Promise<R> {
    const handler = this.queryHandlers.get(query.kind) as QueryHandler<Q, R> | undefined;

    if (!handler) {
      throw new Error(`No query handler registered for ${query.kind}`);
    }

    return handler(query);
  }
}
