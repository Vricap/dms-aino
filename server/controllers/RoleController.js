import Role from "../models/role.js";
import handleError from "../helpers/handleError.js";

const RoleController = {
  /**
   * Get all roles
   * Route: GET /roles
   */
  async getRoles(req, res) {
    try {
      const roles = await Role.find({}, "_id name").sort({ _id: 1 });
      res.status(200).send(roles);
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Create a role
   * Route: POST /roles
   */
  async create(req, res) {
    try {
      const role = new Role(req.body);
      await role.save();
      res.status(201).send({
        id: role._id,
        name: role.name,
        message: "Role berhasil dibuat!",
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Get a single role by ID
   * Route: GET /roles/:id
   */
  async getRole(req, res) {
    try {
      const role = await Role.findById(req.params.id);
      if (!role)
        return res.status(404).send({ message: "Role tidak ditemukan!" });

      res.status(200).send({ id: role._id, name: role.name });
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Update a role
   * Route: PUT /roles/:id
   */
  async update(req, res) {
    try {
      const updatedRole = await Role.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true },
      );

      if (!updatedRole)
        return res.status(404).send({ message: "Role tidak ditemukan!" });

      res.status(200).send({
        id: updatedRole._id,
        name: updatedRole.name,
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Delete a role
   * Route: DELETE /roles/:id
   */
  async delete(req, res) {
    try {
      const role = await Role.findByIdAndDelete(req.params.id);
      if (!role)
        return res.status(404).send({ message: "Role tidak ditemukan!" });

      res.status(200).send({ message: "Role berhasil di hapus!" });
    } catch (error) {
      handleError(error, res);
    }
  },
};

export default RoleController;
