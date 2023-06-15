import {
  Flex,
  Box,
  Button,
  useDisclosure,
  Divider,
  Text,
  Heading,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
  IconButton,
  Icon,
} from "@chakra-ui/react";
import { confessCategories } from "../assets/data/data";
import Confession from "../components/Confession";
import { AddIcon, HamburgerIcon } from "@chakra-ui/icons";
import CreateConfess from "../components/CreateConfess";
import { useState, useEffect, useContext } from "react";
import FilterBar from "../components/FilterBar";
import DeleteConfess from "../components/DeleteConfess";
import ReportConfess from "../components/ReportConfess";
import useToastMessage from "../hooks/useToastMessage";
import {
  collection,
  addDoc,
  db,
  getDocs,
  query,
  where,
  or,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  sendPasswordResetEmail,
  signOut,
  auth,
} from "../firebase/firebase";
import color from "../styles/colors";
import { FaUser } from "react-icons/fa";
import { TbLogout } from "react-icons/tb";
import { RiLockPasswordFill } from "react-icons/ri";
import AccountDrawer from "../components/AccountDrawer";
import { VentifyContext } from "../context/VentifyContextProvider";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import PasswordResetDialog from "../components/PasswordResetDialog";

const Header = (props) => {
  const { onOpen, onAccountDrawerOpen, logout, onPasswordResetDialogOpen } =
    props;
  return (
    <>
      <Flex alignItems="center" justifyContent="space-between" padding="0 20px">
        <Logo />

        <Flex>
          <Button
            textTransform="capitalize"
            variant="solid"
            size="md"
            colorScheme="purple"
            rightIcon={<AddIcon boxSize="13px" />}
            onClick={onOpen}
            marginRight="20px"
          >
            confess
          </Button>

          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Menu"
              icon={<HamburgerIcon />}
              variant="outline"
              colorScheme="blackAlpha"
              size="md"
            />

            <MenuList>
              <MenuGroup title="Profile">
                <MenuItem
                  onClick={onAccountDrawerOpen}
                  icon={<Icon as={FaUser} />}
                >
                  My Account
                </MenuItem>
              </MenuGroup>
              <MenuDivider />
              <MenuGroup title="Help">
                <MenuItem
                  onClick={onPasswordResetDialogOpen}
                  icon={<Icon as={RiLockPasswordFill} />}
                >
                  Reset Password
                </MenuItem>
                <MenuItem
                  color="red"
                  onClick={logout}
                  icon={<Icon as={TbLogout} />}
                >
                  Logout
                </MenuItem>
              </MenuGroup>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
      <Divider orientation="horizontal" />
    </>
  );
};

const AppliedFiltersHeading = (props) => {
  const { selectedCategories, selectedBatches } = props;

  if (selectedCategories.length === 0 && selectedBatches.length === 0) {
    return;
  }

  return (
    <Heading
      fontSize="21px"
      paddingTop="15px"
      paddingBottom="30px"
      fontWeight="400"
      textAlign="center"
      marginRight="50px"
      as="h2"
    >
      We are displaying confessions
      {selectedCategories.length > 0 && " categorized under "}
      <Text
        as="span"
        color={color.primary}
        fontWeight="600"
        textTransform="capitalize"
      >
        {selectedCategories.join(", ")}
      </Text>
      {selectedBatches.length > 0 && " from the batches "}
      <Text
        as="span"
        color={color.primary}
        fontWeight="600"
        textTransform="capitalize"
      >
        {[...selectedBatches].sort((a, b) => a - b).join(", ")}
      </Text>
    </Heading>
  );
};

const ConfessionsPage = () => {
  const [confession, setConfession] = useState("");
  const [confessionCategory, setConfessionCategory] = useState(
    confessCategories[0].title
  );
  const [isVisibleToBatchOnly, setIsVisibleToBatchOnly] = useState(false);
  const [commentIsDisabled, setCommentIsDisabled] = useState(false);

  const [isConfessing, setIsConfessing] = useState(false);
  const { showToastMessage } = useToastMessage();
  const [confessionToBeDelete, setConfessionToBeDelete] = useState({});
  const [confessionToBeReport, setConfessionToBeReport] = useState({});

  const [confessions, setConfessions] = useState([]);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [showBatchExclusiveConfessions, setShowBatchExclusiveConfessions] =
    useState(false);

  const navigate = useNavigate();

  const { loggedInBatchYear } = useContext(VentifyContext);

  const [passwordIsResetting, setPasswordIsResetting] = useState(false);

  const {
    isOpen: isCreateConfessOpen,
    onOpen: onCreateConfessOpen,
    onClose: onCreateConfessClose,
  } = useDisclosure();

  const {
    isOpen: isDeleteConfessOpen,
    onOpen: onDeleteConfessOpen,
    onClose: onDeleteConfessClose,
  } = useDisclosure();

  const {
    isOpen: isReportConfessOpen,
    onOpen: onReportConfessOpen,
    onClose: onReportConfessClose,
  } = useDisclosure();

  const {
    isOpen: isAccountDrawerOpen,
    onOpen: onAccountDrawerOpen,
    onClose: onAccountDrawerClose,
  } = useDisclosure();

  const {
    isOpen: isPasswordResetDialogOpen,
    onOpen: onPasswordResetDialogOpen,
    onClose: onPasswordResetDialogClose,
  } = useDisclosure();

  const resetConfession = () => {
    setConfession("");
    setConfessionCategory(confessCategories[0].title);
    setIsVisibleToBatchOnly(false);
    setCommentIsDisabled(false);
    setIsConfessing(false);
    onCreateConfessClose();
  };

  const handleCategoryChange = (event) => {
    setConfessionCategory(event.target.value);
  };

  const handleIsVisibleToBatchOnlyChange = (event) => {
    setIsVisibleToBatchOnly(event.target.checked);
  };

  const handleCommentIsDisabledChange = (event) => {
    setCommentIsDisabled(event.target.checked);
  };

  const createConfession = async () => {
    setIsConfessing(true);

    const confessionObj = {
      confession: confession,
      category: confessionCategory,
      batchYear: Number(loggedInBatchYear),
      isVisibleToBatchOnly: isVisibleToBatchOnly,
      commentIsDisabled: commentIsDisabled,
      timeStamp: new Date(),
      comments: [],
      reports: [],
    };

    try {
      const confessionRef = await addDoc(
        collection(db, "confessions"),
        confessionObj
      );
      const deletionCode = confessionRef.id;
      navigator.clipboard.writeText(deletionCode);

      showToastMessage(
        "Congratulations",
        `You have confessed succesfully!! The deletion code for this confession is ${deletionCode} and copied to clipboard.`,
        "success"
      );
    } catch (e) {
      console.error("Error adding document: ", e);
    }
    resetConfession();

    getConfessions();
  };

  const deleteConfession = async (confessionDeletionCode) => {
    if (confessionDeletionCode != confessionToBeDelete.id) {
      onDeleteConfessClose();
      showToastMessage(
        "Error",
        "The deletion code you have entered is incorrect!!",
        "warning"
      );
      setConfessionToBeDelete({});
      return;
    }
    onDeleteConfessClose();

    await deleteDoc(doc(db, "confessions", confessionDeletionCode));

    showToastMessage(
      "Deleted",
      "Confession is successfully deleted",
      "success"
    );
    setConfessionToBeDelete({});
    getConfessions();
  };

  const reportConfession = async (confessionId, reasonToReport) => {
    const confessionRef = doc(db, "confessions", confessionId);

    const reportObj = {
      batchYear: loggedInBatchYear,
      reasonToReport: reasonToReport,
      timeStamp: new Date(),
    };
    try {
      await updateDoc(confessionRef, {
        reports: arrayUnion(reportObj),
      });
      onReportConfessClose();

      showToastMessage("Reported", "We will look into it!", "success");
    } catch {
      showToastMessage("Error", "Try again later!", "error");
    }

    setConfessionToBeReport({});
  };

  const getConfessions = async () => {
    const confessionsRef = collection(db, "confessions");

    const confessionsQuery = query(
      confessionsRef,
      or(
        where("isVisibleToBatchOnly", "==", false),
        where("batchYear", "==", Number(loggedInBatchYear))
      )
    );

    const querySnapshot = await getDocs(confessionsQuery);
    const confessionsData = [];
    querySnapshot.forEach((doc) => {
      confessionsData.push({ id: doc.id, ...doc.data() });
    });
    setConfessions(confessionsData);
  };

  const handleCategorySelection = (selectedCategory) => {
    if (selectedCategories.includes(selectedCategory)) {
      setSelectedCategories(
        selectedCategories.filter((category) => category !== selectedCategory)
      );
    } else {
      setSelectedCategories([...selectedCategories, selectedCategory]);
    }
  };

  const handleBatchSelection = (selectedBatch) => {
    if (selectedBatches.includes(selectedBatch)) {
      setSelectedBatches(
        selectedBatches.filter((batch) => batch !== selectedBatch)
      );
    } else {
      setSelectedBatches([...selectedBatches, selectedBatch]);
    }
  };

  const toggleShowBatchExclusiveConfessions = (event) => {
    setShowBatchExclusiveConfessions(event.target.checked);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBatches([]);
    setShowBatchExclusiveConfessions(false);
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem("loggedInBatchYear");
    navigate("/", { replace: true });

    showToastMessage("Successful", "You have logged out!!", "success");
  };

  const resetPassword = () => {
    setPasswordIsResetting(true);
    sendPasswordResetEmail(auth, auth.currentUser.email)
      .then(() => {
        logout();
        showToastMessage(
          "Successful",
          "Check your email to reset your password.",
          "success"
        );
        setPasswordIsResetting(false);
      })
      .catch((error) => {
        setPasswordIsResetting(false);
      });
  };

  useEffect(() => {
    getConfessions();
  }, []);

  return (
    <Box overflow="hidden" height="100vh">
      <Header
        onOpen={onCreateConfessOpen}
        onAccountDrawerOpen={onAccountDrawerOpen}
        onPasswordResetDialogOpen={onPasswordResetDialogOpen}
        logout={logout}
      />
      <Flex>
        <FilterBar
          handleCategorySelection={handleCategorySelection}
          selectedCategories={selectedCategories}
          handleBatchSelection={handleBatchSelection}
          selectedBatches={selectedBatches}
          toggleShowBatchExclusiveConfessions={
            toggleShowBatchExclusiveConfessions
          }
          showBatchExclusiveConfessions={showBatchExclusiveConfessions}
          clearAllFilters={clearAllFilters}
        />
        <Box flex="1" paddingLeft="30px">
          <AppliedFiltersHeading
            selectedCategories={selectedCategories}
            selectedBatches={selectedBatches}
          />

          <Flex
            wrap="wrap"
            gap="5"
            justifyContent="center"
            overflow="auto"
            maxHeight="800px"
            paddingTop="30px"
            paddingBottom="300px"
          >
            {confessions
              .filter(
                (item) =>
                  (selectedCategories.length === 0 ||
                    selectedCategories.includes(item.category)) &&
                  (selectedBatches.length === 0 ||
                    selectedBatches.includes(item.batchYear)) &&
                  (!showBatchExclusiveConfessions || item.isVisibleToBatchOnly)
              )
              .map((item) => (
                <Confession
                  {...item}
                  key={item.id}
                  onDeleteConfessOpen={onDeleteConfessOpen}
                  setConfessionToBeDelete={setConfessionToBeDelete}
                  onReportConfessOpen={onReportConfessOpen}
                  setConfessionToBeReport={setConfessionToBeReport}
                  getConfessions={getConfessions}
                />
              ))}
          </Flex>
        </Box>
      </Flex>
      <CreateConfess
        isCreateConfessOpen={isCreateConfessOpen}
        createConfession={createConfession}
        handleCategoryChange={handleCategoryChange}
        handleIsVisibleToBatchOnlyChange={handleIsVisibleToBatchOnlyChange}
        handleCommentIsDisabledChange={handleCommentIsDisabledChange}
        confession={confession}
        setConfession={setConfession}
        confessionCategory={confessionCategory}
        isVisibleToBatchOnly={isVisibleToBatchOnly}
        commentIsDisabled={commentIsDisabled}
        isConfessing={isConfessing}
        resetConfession={resetConfession}
      />
      <DeleteConfess
        isDeleteConfessOpen={isDeleteConfessOpen}
        onDeleteConfessClose={onDeleteConfessClose}
        confessionToBeDelete={confessionToBeDelete}
        deleteConfession={deleteConfession}
      />

      <ReportConfess
        isReportConfessOpen={isReportConfessOpen}
        onReportConfessClose={onReportConfessClose}
        confessionToBeReport={confessionToBeReport}
        reportConfession={reportConfession}
      />
      <AccountDrawer
        isAccountDrawerOpen={isAccountDrawerOpen}
        onAccountDrawerClose={onAccountDrawerClose}
        onPasswordResetDialogOpen={onPasswordResetDialogOpen}
        logout={logout}
      />
      <PasswordResetDialog
        isPasswordResetDialogOpen={isPasswordResetDialogOpen}
        onPasswordResetDialogClose={onPasswordResetDialogClose}
        passwordIsResetting={passwordIsResetting}
        resetPassword={resetPassword}
      />
    </Box>
  );
};

export default ConfessionsPage;
