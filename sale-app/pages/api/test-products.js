import { getSessionKey, getProducts } from "../../lib/ecount";

export default async function handler(req, res) {
    try {
        const auth = await getSessionKey();
        const allProducts = await getProducts(auth.sessionKey, auth.hostUrl);
        res.status(200).json({ productsCount: allProducts?.length || 0, sample: allProducts?.slice(0,2) });
    } catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
}
