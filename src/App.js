import React, { useEffect, useState } from "react";
import Tesseract from "tesseract.js";
import { Container, Typography, Box, Paper, TextField } from "@mui/material";
import ImageUpload from "./components/ImageUpload";
import RawText from "./components/RawData";
import { parseData } from "./utils/parseData";
import DataTable from "./components/DataTable";
import { collection, doc, getDocs, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "./utils/firebase";
import { calcs } from "./utils/calcs";

export default function ImageToDataApp() {
  const [image, setImage] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataTable, setDataTable] = useState({});
  const [name, setName] = useState("");
  // const [archerAtlantis, setArcherAtlantis] = useState("");
  // const [cavalryAtlantis, setCavalryAtlantis] = useState("");

  const desiredKeys = [
    "Troop Attack",
    "Troop Damage",
    "Troop Attack Blessing",
    "Archer Attack",
    "Archer Damage",
    "Archer Attack Blessing",
    "Cavalry Attack",
    "Cavalry Damage",
    "Cavalry Attack Blessing",
    "Lethal Hit Rate"
  ];

  const getNumber = (val) => parseFloat(val?.toString().replace(/[^\d.]/g, "")) || 0;
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "stats"));
        const data = {};
        querySnapshot.forEach((doc) => {
          data[doc.id] = doc.data();
        });
        setDataTable(data);
        console.log("✅ Loaded data from Firestore");
      } catch (error) {
        console.error("❌ Error loading data from Firestore:", error);
      }
    };

    fetchData();
  }, []);

  const updateFirestore = async (playerName, data) => {
    try {
      await setDoc(doc(db, "stats", playerName), { ...data }, { merge: true });
      console.log(`✅ Firestore updated for: ${playerName}`);
    } catch (error) {
      console.error("❌ Firestore update failed:", error);
    }
  };

  const deletePlayer = async (playerName) => {
    try {
      await deleteDoc(doc(db, "players", playerName));
      const updatedTable = { ...dataTable };
      delete updatedTable[playerName];
      setDataTable(updatedTable);
      console.log("🗑️ Deleted player:", playerName);
    } catch (error) {
      console.error("❌ Error deleting player:", error);
    }
  }
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setText("");

    }
  };

  const extractText = async () => {
    if (!image) return;
    setLoading(true);
    const result = await Tesseract.recognize(image, "eng");
    const extracted = result.data.text;
    setText(extracted);
    setLoading(false);
    const attributes = parseData(extracted, desiredKeys);

    attributes["Archer Atlantis"] = '0';
    attributes["Cavalry Atlantis"] = '0';
    attributes["Final Archer Damage"] = getNumber(calcs(attributes, "archer", attributes["Archer Atlantis"]));
    
    attributes["Final Cavalry Damage"] =getNumber(calcs(attributes, "cavalry", attributes["Cavalry Atlantis"]));
    const updatedTable = { ...dataTable, [name]: attributes };
    setDataTable(updatedTable);

    await updateFirestore(name, attributes);
  };



  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom color="primary">
        Game Image Data Extractor
      </Typography>
      <TextField
        label="Enter Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <Box component={Paper} elevation={3} sx={{ p: 3, mb: 4 }}>
        <ImageUpload
          image={image}
          onUpload={handleImageUpload}
          onExtract={extractText}
          loading={loading}
          name={name}
        />
      </Box>

      {Object.entries(dataTable).length > 0 && (
        <DataTable
          tableData={dataTable}
          desiredKeys={desiredKeys}
          onDelete={deletePlayer}
          onUpdate={updateFirestore}
        />
      )}

      <RawText text={text} />

    </Container>
  );
};