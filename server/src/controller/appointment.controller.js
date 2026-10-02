import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { visitTypes } from '../db/schema/index.js';

//Get all Visit Type
export const getAllVisitType = async (req, res) => {
   try {
      const types = await db.select().from(visitTypes);

      res.status(200).json({ visitTypes: types });
   } catch (error) {
      console.log(`Error: ${error}`);
      return res.status(500).json({ message: 'Internal server error.' });
   }
};

// Get a specific Visit Type
export const getVisitType = async (req, res) => {
   try {
      const { id } = req.params;

      const type = await db
         .select()
         .from(visitTypes)
         .where(eq(visitTypes.id, id));

      res.status(200).json({ visitType: type });
   } catch (error) {
      console.log(`Error: ${error}`);
      return res.status(500).json({ message: 'Internal server error.' });
   }
};
