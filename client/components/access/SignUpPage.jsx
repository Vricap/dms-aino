import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { saveUser } from "../../actions/accessActions.js";
import { validateSignUp } from "../../utilities/validator.js";
import SignUpForm from "./SignUpForm.jsx";
import { handleError } from "../../utilities/errorHandler.js";

/**
 * SignUpPage component
 *
 * @class SignUpPage
 * @extends {React.Component}
 */
export class SignUpPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = Object.assign(
      { password: "", confirmPassword: "", errors: {} },
      props.profile,
    );
    this.onSubmit = this.onSubmit.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  /**
   * Validate and submit the form
   *
   * @param {Object} event
   * @returns {Void} returns nothing
   */
  onSubmit(event) {
    event.preventDefault();
    const { valid, errors } = validateSignUp(this.state);
    if (valid) {
      this.setState({ errors: {} });
      this.props
        .saveUser(this.state)
        .then(() => {
          Materialize.toast("Success!", 2000);
          this.context.router.push("/");
        })
        .catch((error) => handleError(error));
    } else {
      this.setState({ errors });
    }
  }

  /**
   * Control input fields
   *
   * @param {Object} event
   * @returns {Void} returns nothing
   */
  onChange(event) {
    return this.setState({ [event.target.name]: event.target.value });
  }

  /**
   * Render the component
   *
   * @returns {Object} jsx component
   */
  render() {
    return (
      <SignUpForm
        onSubmit={this.onSubmit}
        onChange={this.onChange}
        userDetails={this.state}
      />
    );
  }
}

SignUpPage.propTypes = {
  saveUser: PropTypes.func.isRequired,
  profile: PropTypes.object.isRequired,
};

SignUpPage.contextTypes = {
  router: PropTypes.object,
};

export default connect(
  (state) => ({
    profile: state.users.userProfile,
  }),
  { saveUser },
)(SignUpPage);
