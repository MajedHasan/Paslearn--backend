"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClassrooms = listClassrooms;
/**
 * Example protected route: list classrooms
 */
async function listClassrooms(req, res) {
    // In a real app we'd fetch from DB. Here return example data.
    const example = [
        { id: "c1", name: "Math 101", teacher: "teacher1@example.com" },
        { id: "c2", name: "History 201", teacher: "teacher2@example.com" },
    ];
    res.json({ classrooms: example });
}
