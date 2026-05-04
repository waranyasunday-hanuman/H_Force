// pages/api/products.js
import { getSessionKey, getProducts } from "../../lib/ecount";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const sessionKey = await getSessionKey();
        const allProducts = await getProducts(sessionKey);

        res.status(200).json({ products: allProducts || [] });
    } catch (error) {
        console.error("API Error getProducts:", error);
        res.status(500).json({ error: "Cannot fetch products" });
    }
}
