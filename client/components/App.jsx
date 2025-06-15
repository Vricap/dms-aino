import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Header from "./include/Header.jsx";
import Footer from "./include/Footer.jsx";
import Spinner from "./common/Spinner.jsx";

/**
 * Top level application wrapper
 *
 * @class App
 * @extends {React.Component}
 */
class App extends React.Component {
  render() {
    return (
      <div>
        <Header />
        <main>
          {this.props.loading > 0 && <Spinner />}
          {this.props.children}
        </main>
        <Footer />
      </div>
    );
  }
}

App.propTypes = {
  children: PropTypes.object.isRequired,
  loading: PropTypes.number.isRequired,
};

export default connect((state) => ({
  loading: state.ajaxCallsInProgress,
}))(App);
