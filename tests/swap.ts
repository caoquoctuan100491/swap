import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Swap } from "../target/types/swap";
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createCtx, Ctx } from "./helpers/ctx";
import { RPC } from "./helpers/rpc";
import { CheckCtx } from "./helpers/check";

describe("swap", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  
  const program = anchor.workspace.Swap as Program<Swap>;
  const connection = new Connection("http://localhost:8899", 'recent');
  let ctx: Ctx;
 
  it("Initializes!", async () => {
    console.log("Initializes");
    ctx = await createCtx(connection, program);
    await RPC.initialize(ctx);
    await CheckCtx.poolInitialState(ctx);
  });

  it("Swap tokens from the program", async () => {
    console.log("Swap tokens from the program");
    const amount = new anchor.BN(4);
    const poolBalanceBefore = (await connection.getAccountInfo(ctx.accounts.pool.key)).lamports;
    console.log("lamports:" + poolBalanceBefore);

    await RPC.swapTokens(ctx, ctx.user.signer, amount);

    // Traders should receive their tokens
    await CheckCtx.lamportsBalance(ctx, ctx.user.ata);

    await CheckCtx.tokenBalance(ctx, ctx.user.ata);
  });

});


