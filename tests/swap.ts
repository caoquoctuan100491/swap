import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Swap } from "../target/types/swap";
import { Connection, LAMPORTS_PER_SOL, clusterApiUrl, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { createCtx, Ctx } from "./helpers/ctx";
import { RPC } from "./helpers/rpc";
import { getAssociatedTokenAddress, getMint, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';

describe("swap", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Swap as Program<Swap>;
  const connection = new Connection(clusterApiUrl("devnet"), 'recent');
  let ctx: Ctx;

  // it("Initializes!", async () => {
  //   ctx = await createCtx(connection, program);
  //   await RPC.initialize(ctx);
  //   await CheckCtx.poolInitialState(ctx);
  // });

  // it("Swap tokens from the program", async () => {
  //   // ctx = await createCtx(connection, program);
  //   const amount = new anchor.BN(1 * 1e6);
  //   await RPC.swapTokens(ctx, ctx.user.signer, amount);
  // });

  it("Only swap", async () => {
    const amount = new anchor.BN(1 * 1e6);

    const mintPublicKey = new PublicKey("4v8TYXZg9sAyt8sPhgWi2umwQQ5fUXRvcNrm6dat4KKo");
    const mint = await getMint(connection, mintPublicKey);

    const [poolPDA, poolBump] = await anchor.web3.PublicKey.findProgramAddress(
      [mint.address.toBuffer()],
      program.programId
    );

    const user = Keypair.fromSecretKey(Uint8Array.from([
      43, 49, 182, 145, 223, 255, 23, 12, 179, 31, 104,
      83, 70, 235, 108, 25, 10, 33, 168, 242, 120, 201,
      207, 199, 249, 58, 4, 44, 129, 73, 18, 32, 112,
      143, 7, 143, 99, 245, 40, 74, 91, 107, 135, 236,
      254, 213, 243, 210, 205, 68, 73, 92, 44, 102, 202,
      19, 68, 14, 137, 243, 111, 74, 186, 150
    ]));
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint.address,
      user.publicKey
    );
    const vault = await getAssociatedTokenAddress(mint.address, poolPDA, true);

    let tx = await program.methods.swapToken(
      { tokens: amount },
    ).accounts({
      poolAccount: poolPDA,
      tokenMint: mint.address,
      vault: vault,
      user: user.publicKey,
      userTokenAccount: ata.address,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([user]).rpc();
    console.log("transaction: " + tx);
  });
});


