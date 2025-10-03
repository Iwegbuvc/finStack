const validateNewUser = async(req, res, next)=>{
    const { firstName, lastName, email, password } = req.body

    const errors = []

    if(!firstName) errors.push("Firstname is required")

    if(!lastName) errors.push("lastname is required")

    if(!email){
        errors.push("Please enter an email")
    }else if(!validateEmail(email)){
        errors.push("Invalid email format")
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
    errors.push("Password must contain uppercase, lowercase, number, and special character");
    }

  //   if(!phoneNumber) {errors.push("Phone number is required")

  //   }else if (!/^\d{7,15}$/.test(phoneNumber)) {
  //   errors.push("Invalid phone number format");
  // }

    if(errors.length > 0){
        return res.status(400).json({message: errors})
    }

    next()

}

const validateLogin = async(req, res, next)=>{
const {email, password} = req.body

const errors = []

if(!email){
   errors.push("Enter your email")
}else if(!validateEmail(email)){
    errors.push("Enter a valid email")
}

  if(!password){
    errors.push("Please enter your password")
}


if(errors.length > 0){
    return res.status(400).json({message: errors})
}

next()
}

// validatePassword.js
const validatePassword = (req, res, next) => {
  const { password } = req.body;
  const errors = [];

  if (!password) {
    errors.push("Enter your password");
  } else if (
    !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)
  ) {
    errors.push("Password must contain uppercase, lowercase, number, and special character");
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors });
  }

  next();
};




function validateEmail(email){
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailRegex.test(String(email).toLowerCase())
}

module.exports = {validateNewUser, validateLogin, validatePassword}