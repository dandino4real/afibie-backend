import { Router } from "express";
import { CryptoUserController } from "../controllers/crypto_user.controller";
import { authenticateAdmin, authorizePermission } from "../middlewares/auth.middleware";



const router = Router();

router.get("/crypto", authenticateAdmin, CryptoUserController.getUsers);
router.patch(
'/crypto/:id/approve',
authenticateAdmin,
authorizePermission('approve_registration'),
CryptoUserController.approveCryptoUser
);

router.patch(
'/crypto/:id/reject',
authenticateAdmin,
authorizePermission('reject_registration'),
CryptoUserController.rejectCryptoUser
);

router.delete(
  "/crypto/:id",
  authenticateAdmin,
  authorizePermission("delete_users"),
  CryptoUserController.deleteUser
);

export default router;
