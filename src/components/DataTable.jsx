import React, { useState, useEffect, useMemo, useCallback } from "react";

import { doc, setDoc,getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    TextField,
    Stack,
    Input,
    Grid,
    useMediaQuery,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTheme } from "@mui/material/styles";
import { calcs } from "../utils/calcs";

import { getColorByThreshold } from "../utils/colorUtils";

export default function DataTable({ tableData = {}, desiredKeys = [], onDelete, onUpdate }) {

    const [localData, setLocalData] = useState(tableData);
    const [thresholds, setThresholds] = useState([]);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const getNumber = (val) => parseFloat(val?.toString().replace(/[^\d.]/g, "")) || 0;

    const calculateAll = useCallback((player) => {
        const archer = getNumber(calcs(player, "archer", player["Archer Atlantis"]));
        const cavalry = getNumber(calcs(player, "cavalry", player["Cavalry Atlantis"]));
        const multiplier = getNumber(player["Multiplier"]);
        return {
          "Final Archer Damage": (archer * multiplier).toFixed(5),
          "Final Cavalry Damage": (cavalry * multiplier).toFixed(5),
        };
      }, []);

    const handleEdit = (name, field, value) => {
        const updatedPlayer = {
            ...localData[name],
            [field]: value,
        };
        const calculated = calculateAll(updatedPlayer);
        const updatedData = {
            ...localData,
            [name]: {
                ...updatedPlayer,
                ...calculated,
            },
        };

        setLocalData(updatedData);
        onUpdate(name, {
            ...updatedPlayer,
            ...calculated,
        });
    };
    const handleThresholdChange = async (index, field, value) => {
        const newThresholds = [...thresholds];
        newThresholds[index] = {
          ...newThresholds[index],
          [field]: field === "limit" ? parseFloat(value) || 0 : value,
        };
        setThresholds(newThresholds);
    
        try {
          const thresholdRef = doc(db, "settings", "thresholds");
          await setDoc(thresholdRef, {
            thresholds: newThresholds
          });
        } catch (error) {
          console.error("Error updating thresholds in Firestore:", error);
        }
      };
    
    useEffect(() => {
        const fetchThresholds = async () => {
            try {
                const thresholdRef = doc(db, "settings", "thresholds");
                const snapshot = await getDoc(thresholdRef);
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    if (data.thresholds) {
                        setThresholds(data.thresholds);
                    }
                }
            } catch (error) {
                console.error("Failed to load thresholds from Firestore:", error);
            }
        };

        fetchThresholds();
    }, []);

    useEffect(() => {
        const updated = {};
        Object.entries(tableData).forEach(([name, data]) => {
            const calculated = calculateAll(data);
            updated[name] = {
                ...data,
                ...calculated,
            };
        });
        setLocalData(updated);
    }, [tableData, calculateAll, thresholds]);

    const names = useMemo(() => Object.keys(localData), [localData]);
    if (!names.length) return null;

    return (
        <Box component={Paper} elevation={3} sx={{ p: 2, mb: 4, overflowX: "auto" }}>
            <Typography variant="h6" gutterBottom textAlign="center">
                Threshold Settings
            </Typography>

            <Grid container spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                {thresholds.map((thresh, idx) => (
                    <Grid size ={{xs:6, sm:4, md:2}} key={idx}>
                        <Stack spacing={1} alignItems="center">
                            <TextField
                                label={`Limit ${idx + 1}`}
                                value={thresh.limit}
                                onChange={(e) => handleThresholdChange(idx, "limit", e.target.value)}
                                size="small"
                                type="number"
                                fullWidth
                            />
                            <Input
                                type="color"
                                value={thresh.color}
                                onChange={(e) => handleThresholdChange(idx, "color", e.target.value)}
                                sx={{ width: "100%", height: 40, borderRadius: 1, border: '1px solid #ccc' }}
                            />
                        </Stack>
                    </Grid>
                ))}
            </Grid>
            <Typography variant="h6" gutterBottom>
                Combined Stats Table
            </Typography>

            <TableContainer sx={{ minWidth: isMobile ? 700 : "100%" }}>
                <Table size="small" sx={{ minWidth: "100%" }}>
                    <TableHead>
                        <TableRow>
                            <TableCell><b>Name</b></TableCell>
                            {desiredKeys.map((key) => (
                                <TableCell key={key}><b>{key}</b></TableCell>
                            ))}
                            <TableCell><b>Multiplier</b></TableCell>
                            <TableCell><b>Archer Atlantis</b></TableCell>
                            <TableCell><b>Cavalry Atlantis</b></TableCell>
                            <TableCell><b>Final Archer Damage</b></TableCell>
                            <TableCell><b>Final Cavalry Damage</b></TableCell>
                            <TableCell><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {names.map((name) => {
                            const rowData = localData[name];
                            const archerVal = getNumber(rowData["Final Archer Damage"]);
                            const cavalryVal = getNumber(rowData["Final Cavalry Damage"]);
                            const archerColor = getColorByThreshold(archerVal, thresholds);
                            const cavalryColor = getColorByThreshold(cavalryVal, thresholds);

                            return (
                                <TableRow key={name}  >
                                    <TableCell>{name}</TableCell>
                                    {desiredKeys.map((key) => (
                                        <TableCell key={key}>
                                            <TextField
                                                value={rowData[key] || ""}
                                                onChange={(e) => handleEdit(name, key, e.target.value)}
                                                size="small"

                                            />
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <TextField
                                            value={rowData["Multiplier"] || ""}
                                            onChange={(e) => handleEdit(name, "Multiplier", e.target.value)}
                                            size="small"
                                            fullWidth
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={rowData["Archer Atlantis"] || ""}
                                            onChange={(e) => handleEdit(name, "Archer Atlantis", e.target.value)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            value={rowData["Cavalry Atlantis"] || ""}
                                            onChange={(e) => handleEdit(name, "Cavalry Atlantis", e.target.value)}
                                            size="small"
                                        />
                                    </TableCell>

                                    <TableCell sx={{
                                        backgroundColor: archerColor
                                    }} >
                                        {archerVal}
                                    </TableCell>

                                    <TableCell sx={{ backgroundColor: cavalryColor }}>
                                        {cavalryVal}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton color="error" onClick={() => onDelete(name)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                        }
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
