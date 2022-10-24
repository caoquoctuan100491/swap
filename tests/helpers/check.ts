import * as anchor from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { Ctx } from "./ctx";
import {
    getAccount as getTokenAccount,
    getAssociatedTokenAddress,
    Account as TokenAccount, getMinimumBalanceForRentExemptAccount,
} from '@solana/spl-token';

type Balance = number | anchor.BN | bigint;

export namespace CheckCtx {
    export async function lamportsBalance(ctx: Ctx, key: PublicKey) {
        await Check.lamportsBalance(ctx.connection, key);
    }

    export async function tokenBalance(ctx: Ctx, key: PublicKey) {
        await Check.tokenBalance(ctx.connection, key);
    }

    export async function poolInitialState(ctx: Ctx) {
        const pool = await ctx.program.account.poolAccount.fetch(ctx.accounts.pool.key);
        expect(`${pool.owner}`).to.be.eq(`${ctx.owner.publicKey}`);
        expect(`${pool.tokenMint}`).to.be.eq(`${ctx.token_mint}`);
        expect(`${pool.bump}`).to.be.eq(`${ctx.accounts.pool.bump}`);
        expect(`${pool.vault}`).to.be.eq(`${ctx.vault}`);

    }
}

export namespace Check {
    export async function lamportsBalance(connection: Connection, account: PublicKey) {
        let info = await connection.getAccountInfo(account);
        console.log("lamports: " + info.lamports);
    }

    export async function tokenBalance(connection: Connection, key: PublicKey) {
        let acc: TokenAccount | null = await getTokenAccount(connection, key).catch(() => null);
        console.log("token: " + acc.amount);
    }
}
