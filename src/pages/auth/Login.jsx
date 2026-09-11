import {
  Button,
  Checkbox,
  Form,
  Input,
  Tab,
  Tabs,
} from "@heroui/react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { setUser } from "../../redux/reducers/user";
import { useDispatch } from "react-redux";
import { api } from "../../services/api";
import { successMessage, errorMessage } from "../../lib/toast.config";
import { analyticsEvents } from "../../lib/analytics";

const PasswordInput = ({ label, value, onChange, placeholder, autoComplete = "password" }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full space-y-2">
      {label && <p className="text-sm lg:text-base text-[#3F3F44]">{label}</p>}
      <Input
        className="rounded-md"
        placeholder={placeholder}
        value={value}
        name="password"
        autoComplete={autoComplete}
        type={showPassword ? "text" : "password"}
        endContent={
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOffIcon className="cursor-pointer" size={20} />
            ) : (
              <EyeIcon className="cursor-pointer" size={20} />
            )}
          </button>
        }
        onChange={onChange}
      />
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "register" ? "register" : "login";

  const handleTabChange = (key) => {
    const nextTab = String(key);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextTab === "login") {
          next.delete("tab");
        } else {
          next.set("tab", nextTab);
        }
        return next;
      },
      { replace: false },
    );
  };

  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const completeAuth = (data, remember) => {
    dispatch(setUser(data.user));

    // const token = data.token;
    // if (token) {
    // localStorage.setItem("token", token);

    //   if (import.meta.env.PROD) {
    //     document.cookie = [
    //       `token=${token}`,
    //       `domain=.darulquranleicester.co.uk`,
    //       `path=/`,
    //       `max-age=${remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60}`,
    //       `secure`,
    //       `samesite=lax`,
    //     ].join("; ");
    //   }
    // }

    const role = data.user.role?.toLowerCase();
    analyticsEvents.login(role);

    let route = "/";
    if (role === "admin") route = "/admin/dashboard";
    else if (role === "teacher") route = "/teacher/dashboard";
    else if (role === "student") route = "/student/dashboard";

    navigate(route, { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password, rememberMe });
      successMessage("Login successful");
      completeAuth(data, rememberMe);
    } catch {
      // Error toast handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (registerPassword !== confirmPassword) {
      errorMessage("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post("/auth/student-register", {
        firstName,
        lastName,
        email: registerEmail,
        password: registerPassword,
      });
      successMessage(data.message || "Account created successfully");
      completeAuth(data, false);
    } catch {
      // Error toast handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col lg:flex-row w-full min-h-screen">
      <div className="lg:h-screen w-full lg:max-w-[400px] xl:max-w-[400px] p-6 lg:p-8 flex flex-col items-center justify-between bg-[#06574C] relative ovexrflow-hidden max-lg:hidden lg:rounded-r-lg">
        <img
          src="/icons/logo.png"
          alt="Darul Quran"
          className=" w-56 h-56 top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute"
        />
      </div>
      <div className="flex-1 flex flex-col max-sm:items-center items-start md:justify-center bg-[#E9E0D6] ml-0! px-6 sm:px-12 md:px-16 lg:px-24 py-8 lg:py-0 m-0 lg:m-6 lg:rounded-r-lg ">
        <img
          src="/icons/darul-quran-logo.png"
          alt="Darul Quran"
          className=" w-45 h-45 md:hidden"
        />
        <div className="w-full max-w-xl mx-auto lg:mx-16">
          <h1 className="text-xl sm:text-3xl lg:text-4xl xl:text-[35px] text-[#3F3F44] leading-tight mb-6 lg:mb-8 font-medium">
            <strong>Welcome</strong>
            {""} to{" "}
            <span className="text-[#95C4BE]">Darul Qur'an Leicester </span>
          </h1>

          <Tabs
            aria-label="Auth tabs"
            selectedKey={activeTab}
            onSelectionChange={handleTabChange}
            color="success"
            variant="underlined"
            classNames={{
              tabList: "mb-4",
              tab: "text-[#3F3F44] font-medium",
              cursor: "bg-[#06574C]",
            }}
          >
            <Tab key="login" title="Login">
              <Form
                onSubmit={handleLogin}
                className="w-full space-y-5 lg:space-y-6 items-center justify-center"
              >
                <div className="w-full space-y-2">
                  <p className="text-sm lg:text-base text-[#3F3F44]">
                    Enter Your Email
                  </p>
                  <Input
                    className="rounded-md"
                    placeholder="youremail@example.com"
                    value={email}
                    type="email"
                    name="email"
                    autoComplete="email"
                    isRequired
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-sm lg:text-base">
                    <p className="text-[#3F3F44]">Password</p>
                    <Link
                      to="/auth/forget-password"
                      className="cursor-pointer hover:underline"
                    >
                      Forget Password?
                    </Link>
                  </div>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>

                <div className="w-full">
                  <Checkbox
                    isSelected={rememberMe}
                    onValueChange={setRememberMe}
                    size="sm"
                    color="success"
                    classNames={{
                      label: "text-[#3F3F44] text-sm lg:text-base",
                    }}
                  >
                    Remember Me
                  </Checkbox>
                </div>

                <div className="flex max-sm:flex-wrap gap-3 w-full">
                  <Button
                    type="submit"
                    className="w-full text-center text-white rounded-md py-3 bg-[#06574C]"
                    isLoading={loading}
                    isDisabled={loading}
                  >
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </div>
              </Form>
            </Tab>

            <Tab key="register" title="New Student Registration">
              <Form
                onSubmit={handleRegister}
                className="w-full space-y-4 lg:space-y-5 items-center justify-center"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div className="space-y-2">
                    <p className="text-sm lg:text-base text-[#3F3F44]">First Name</p>
                    <Input
                      className="rounded-md"
                      placeholder="First name"
                      name="first_name"
                      value={firstName}
                      isRequired
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm lg:text-base text-[#3F3F44]">Last Name</p>
                    <Input
                      className="rounded-md"
                      placeholder="Last name"
                      name="last_name"
                      value={lastName}
                      isRequired
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="w-full space-y-2">
                  <p className="text-sm lg:text-base text-[#3F3F44]">Email</p>
                  <Input
                    className="rounded-md"
                    placeholder="youremail@example.com"
                    value={registerEmail}
                    type="email"
                    name="email"
                    autoComplete="email"
                    isRequired
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>

                <PasswordInput
                  label="Password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Create a password"
                />

                <PasswordInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete='current-password'
                />

                <div className="flex max-sm:flex-wrap gap-3 w-full">
                  <Button
                    type="submit"
                    className="w-full text-center text-white rounded-md py-3 bg-[#06574C]"
                    isLoading={loading}
                    isDisabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Student Account"}
                  </Button>
                </div>
              </Form>
            </Tab>
          </Tabs>
        </div>
      </div>
    </main>
  );
};

export default Login;
