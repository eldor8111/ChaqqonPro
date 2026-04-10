/**
 * Zod DTO validators — Auth
 */
import { z } from "zod";

export const LoginSchema = z.object({
    username: z.string().trim().min(1, "Username kiritilishi shart").max(100),
    password: z.string().min(4, "Parol kamida 4 belgi").max(128),
});

export const ChangePasswordSchema = z.object({
    newPassword: z.string().min(8, "Parol kamida 8 belgi bo'lishi kerak").max(128),
});

export const KassirLoginSchema = z.object({
    username: z.string().trim().min(1, "Username kiritilishi shart").max(100),
    password: z.string().min(1, "Parol kiritilishi shart").max(128),
});

export const JwtRefreshSchema = z.object({
    token: z.string().min(10, "Token kiritilishi shart"),
});

export type LoginDTO           = z.infer<typeof LoginSchema>;
export type ChangePasswordDTO  = z.infer<typeof ChangePasswordSchema>;
export type KassirLoginDTO     = z.infer<typeof KassirLoginSchema>;
export type JwtRefreshDTO      = z.infer<typeof JwtRefreshSchema>;
